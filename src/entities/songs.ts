import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('Songs')
export class Songs {
    @PrimaryColumn('varchar') id: string;

    @PrimaryColumn('varchar') userID: string;

    @Column('varchar') name: string;

    @Column('int') timesPlayed: number;
}