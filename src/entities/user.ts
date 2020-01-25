import { Entity, PrimaryColumn } from 'typeorm';

@Entity('user')
export class DBUser {
    @PrimaryColumn('varchar') id: string;
}
