import { Entity, ManyToOne, PrimaryColumn, Column } from 'typeorm';
import { Playlists } from './playlists';

@Entity('PlaylistSongs')
export class PlaylistSongs {
    @PrimaryColumn('varchar') id: string;

    @PrimaryColumn('int') playlistIndex: number;

    @Column('varchar') name: string;

    @ManyToOne(type => Playlists, playlist => playlist.songs)
    playlist: Playlists;
}