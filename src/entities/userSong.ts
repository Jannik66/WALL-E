import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DBUser } from './user';
import { Song } from './song';

@Entity()
export class UserSong {
    @PrimaryGeneratedColumn() id: number;
    
    @Column('datetime', { nullable: true}) timestamp: Date;
    
    @ManyToOne(type => DBUser)
    user: DBUser;

    @ManyToOne(type => Song)
    song: Song;

}
