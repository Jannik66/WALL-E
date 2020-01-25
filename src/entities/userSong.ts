import { Entity, Column, ManyToOne, PrimaryColumn } from 'typeorm';
import { DBUser } from './user';
import { Song } from './song';

@Entity()
export class UserSong {
    @PrimaryColumn('varchar')
    userSongId: string;

    @ManyToOne(type => DBUser)
    user: DBUser;

    @ManyToOne(type => Song)
    song: Song;

    @Column('int') timesPlayed: number;
}
