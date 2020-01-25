import { Entity, ManyToOne, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Playlist } from './playlist';

@Entity()
export class PlaylistSong {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar') songId: string;

    @Column('varchar') name: string;

    @Column('int') length: number;

    @ManyToOne(type => Playlist, playlist => playlist.songs)
    playlist: Playlist;
}