import type { OnApplicationBootstrap } from '@nestjs/common';
import { ConflictException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModuleRef, Reflector } from '@nestjs/core';
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import type { Module } from '@nestjs/core/injector/module';
import crc from 'crc';
import { MultiMap } from 'mnemonist';
import type { RegisteredOutbox, RegisteredOutboxMethod } from './common';
import { OUTBOX_MODULE_CONFIG, OutboxModuleConfig, TransactionResolverEnum } from './outbox.config';
import { OutboxPersistenceEngine } from '../engines/engine.service';
import type { OutboxDecoratorMetadataType } from './outbox.decorator';
import {
    MANUAL_OUTBOX_DECORATOR_METADATA_GUARD,
    OUTBOX_DECORATOR_METADATA,
} from './outbox.decorator';
import type pino from 'pino';
import type { OnModuleDestroy } from '@nestjs/common/interfaces/hooks/on-destroy.interface';
import { isFunction } from 'lodash';
import type { OutboxModuleEngineConfig } from '../engines';
import type { TransactionParamType } from './param.decorators';
import { OUTBOX_TRANSACTION_PARAM } from './param.decorators';

@Injectable()
export class OutboxService<T = any> implements OnApplicationBootstrap, OnModuleDestroy {
    public readonly outboxes = new Map<string, RegisteredOutbox>();
    private readonly groupings = new MultiMap<string, RegisteredOutbox>();
    private readonly groupingSequential = new Map<string, boolean>();
    private readonly enabledGroupings = new Set<string>();
    private readonly logger: pino.Logger;

    private isRunning = false;
    private timer: NodeJS.Timeout | null = null;
    private readonly stepTimeMs = 1000; // TODO
    private currentPoll: Promise<void> | null = null;

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
        private readonly moduleRef: ModuleRef,
        private readonly reflector: Reflector,
        @Inject(forwardRef(() => OutboxPersistenceEngine))
        private readonly persistence: OutboxPersistenceEngine<T>,
        @Inject(OUTBOX_MODULE_CONFIG)
        private readonly config: OutboxModuleConfig,
    ) {
        this.logger = this.config.logger!.child({ ctx: this.constructor.name });
    }

    onApplicationBootstrap() {
        this.loadOutboxes();
        this.checkOutboxSanity();
        if (this.config.autostartPolling) {
            if (this.enabledGroupings.size > 0) {
                this.run();
            } else {
                this.logger.info('No outbox executors enabled, not running polling');
            }
        }
    }

    async onModuleDestroy() {
        await this.stop();
    }

    public run() {
        if (this.isRunning) return;
        this.logger.info('Starting outbox sender...');
        this.isRunning = true;
        this.pollOutboxes();
    }

    async stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.logger.info('Stopping outbox sender...');
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.currentPoll) {
            await this.currentPoll;
        }
    }

    async pollOutboxes() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.logger.info('Polling outboxes...');
        if (this.currentPoll !== null) {
            await this.currentPoll;
        }
        this.currentPoll = this.pollOutboxesInternal();
        await this.currentPoll;
        this.currentPoll = null;

        if (this.isRunning) {
            this.timer = setTimeout(() => this.pollOutboxes(), this.stepTimeMs);
        }
    }

    private async pollOutboxesInternal() {
        try {
            const groupings = [...this.enabledGroupings];
            const promises = groupings.map((name) =>
                this.persistence.pollOutbox(Boolean(this.groupingSequential.get(name)), name),
            );
            const results = await Promise.allSettled(promises);
            for (const [i, result] of results.entries()) {
                if (result.status === 'rejected') {
                    this.logger.error(
                        { err: result.reason },
                        `Error polling outbox grouping [${groupings[i]}]`,
                    );
                }
            }
        } catch (err) {
            this.logger.error({ err }, `Error polling outboxes`);
        }
    }

    private checkOutboxSanity() {
        const errors: string[] = [];
        this.groupings.forEachAssociation((values, grouping) => {
            let sequential: boolean | null = null;
            let enabled: boolean | null = null;
            values.forEach((outbox) => {
                if (sequential === null) {
                    sequential = outbox.sequential;
                } else if (sequential !== outbox.sequential) {
                    errors.push(
                        `Outbox [${outbox.name}] has wrong 'sequential' value, all values within [${grouping}] must be equal`,
                    );
                }
                if (enabled === null) {
                    enabled = outbox.handlerEnabled;
                } else if (enabled !== outbox.handlerEnabled) {
                    errors.push(
                        `Outbox [${outbox.name}] has wrong 'handlerEnabled' value, all values within [${grouping}] must be equal`,
                    );
                }
            });
            this.groupingSequential.set(grouping, Boolean(sequential));
        });
        if (errors.length > 0) {
            throw new ConflictException(
                ['Outbox configuration errors:', ...errors].join('\n     '),
            );
        }
    }

    private loadOutboxes() {
        const providers = this.discoveryService.getProviders();
        const controllers = this.discoveryService.getControllers();
        [...providers, ...controllers]
            .filter((wrapper) => wrapper.instance && !wrapper.isAlias)
            .forEach((wrapper: InstanceWrapper) => {
                const { instance, name, host } = wrapper;
                const prototype = Object.getPrototypeOf(instance) || {};
                const isRequestScoped = !wrapper.isDependencyTreeStatic();
                this.metadataScanner.scanFromPrototype(instance, prototype, (methodKey: string) => {
                    this.wrapOutboxMethod(
                        name,
                        instance,
                        methodKey,
                        isRequestScoped,
                        host as Module,
                    );
                });
            });
    }

    private wrapOutboxMethod(
        instanceName: string,
        instance: Record<string, any>,
        methodKey: string,
        isRequestScoped: boolean,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        moduleRef: Module,
    ) {
        const eventListenerMetadataWrapper = Reflect.getMetadata(
            OUTBOX_DECORATOR_METADATA,
            instance,
            methodKey,
        ) as OutboxDecoratorMetadataType<any>;
        if (!eventListenerMetadataWrapper) {
            return;
        }
        // @ts-expect-error
        if (eventListenerMetadataWrapper === MANUAL_OUTBOX_DECORATOR_METADATA_GUARD) {
            throw new ConflictException(
                `@ManualOutbox ${instanceName}.${methodKey} does not have configuration present. Did you forget to assign it in constructor?`,
            );
        }
        const eventListenerMetadata = isFunction(eventListenerMetadataWrapper)
            ? eventListenerMetadataWrapper.apply(instance, [instance])
            : eventListenerMetadataWrapper;

        const types = Reflect.getMetadata('design:paramtypes', instance, methodKey);
        if (!types) {
            throw new ConflictException(
                `Could not read design:paramtypes on ${instanceName}.${methodKey}, did you forget the @ManualOutbox decorator?`,
            );
        }
        const {
            name: originalName,
            grouping: originalGrouping,
            sequential,
            enableHandler,
            delay,
            allowInstant,
            instantBypass,
        } = eventListenerMetadata;
        const name = OutboxService.shortName(originalName);
        const grouping = originalGrouping ? OutboxService.shortName(originalGrouping) : name;

        const transactionParamPos = this.getParamPosition(this.config, instance, methodKey);

        const outbox: RegisteredOutboxMethod = {
            type: 'method',
            handlerEnabled: enableHandler,
            name,
            grouping,
            sequential: Boolean(sequential),
            delay: Number(delay < 1 ? 0 : delay),
            allowInstant: Boolean(allowInstant),
            instantBypass: Boolean(instantBypass),
            originalThis: instance,
            originalFunction: instance[methodKey],
            instanceName,
            methodKey,
            argumentCount: types.length,
            transactionParamPos,
        };
        const previousOutbox = this.outboxes.get(name);
        if (previousOutbox) {
            const collided =
                previousOutbox.type === 'method'
                    ? `${previousOutbox.instanceName}.${previousOutbox.methodKey}`
                    : `handler outbox`; // TODO better error message
            throw new ConflictException(
                `Outbox at ${instanceName}.${methodKey} has name collision with ${collided}`,
            );
        }
        this.outboxes.set(name, outbox);
        this.groupings.set(grouping, outbox);

        this.persistence.hookOriginal(this.config, outbox);

        if (!enableHandler) {
            return;
        }
        if (isRequestScoped) {
            throw new ConflictException(
                `Cannot register outbox event handler ${name}@[${methodKey}] for request scoped provider [${instanceName}]`,
            );
        } else {
            this.enabledGroupings.add(name);
        }
    }

    private getParamPosition(
        config: OutboxModuleEngineConfig,
        originalThis: any,
        methodKey: string,
    ): number {
        if (config.transactionResolver !== TransactionResolverEnum.PARAM) {
            return -1;
        }
        const transactionClass = this.persistence.getTransactionClass();
        if (!transactionClass) {
            throw new ConflictException(
                `Transaction resolver is set to PARAM, but not supported by persistence provider ${this.constructor.name}`,
            );
        }
        const decoratedPosition: TransactionParamType = Reflect.getMetadata(
            OUTBOX_TRANSACTION_PARAM,
            originalThis[methodKey],
        );
        if (decoratedPosition) {
            return decoratedPosition.parameterIndex;
        }
        const types = Reflect.getMetadata('design:paramtypes', originalThis, methodKey);
        if (types.length === 0 || types[types.length - 1] !== transactionClass) {
            throw new ConflictException(
                `Transaction resolver is set to PARAM, but last parameter is not of type ${transactionClass.name}`,
            );
        }
        return types.length - 1;
    }

    private static shortName(name: string): string {
        if (name.length > 32) {
            const hash = crc.crc32(name).toString(16);
            return `${name.slice(0, 21)}_${hash}`;
        }
        return name;
    }
}
