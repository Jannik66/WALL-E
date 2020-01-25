import { Entity, ManyToOne, PrimaryColumn, Column } from 'typeorm';
import { Playlist } from './playlist';

@Entity()
export class PlaylistSong {
    @PrimaryColumn('varchar') id: string;

    @Column('varchar') songId: string;

    @Column('varchar') name: string;

    @Column('int') length: number;

    @ManyToOne(type => Playlist, playlist => playlist.songs)
    playlist: Playlist;
}