import { TypeormEngineModule } from './typeorm/typeorm.module';

export const engineImplementations = {
    typeorm: TypeormEngineModule,
    // 'mikro-orm': MikroOrmEngineModule,
};
