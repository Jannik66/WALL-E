import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Song {
    @PrimaryColumn('varchar') id: string;

    @Column('varchar') name: string;

    @Column('int') length: number;
}
