import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PlaylistSongs } from './playlistSongs';

@Entity('Playlists')
export class Playlists {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar', { unique: true }) name: string;

    //@Column('boolean') inRandom: boolean;

    @OneToMany(type => PlaylistSongs, song => song.playlist)
    songs: PlaylistSongs[];
}