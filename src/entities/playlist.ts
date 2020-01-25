import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PlaylistSong } from './playlistSong';

@Entity()
export class Playlist {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar', { unique: true }) name: string;

    @Column('boolean') inRandom: boolean;

    @OneToMany(type => PlaylistSong, song => song.playlist)
    songs: PlaylistSong[];
}