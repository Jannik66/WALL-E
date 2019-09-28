import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('VoiceStats')
export class VoiceStats {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar') userID: string;

    @Column('varchar') voiceChannelID: string;

    @Column('datetime') joinedTimeStamp: Date;

    @Column({ type: 'datetime', nullable: true }) leftTimeStamp: Date;

    @Column({ type: 'int', nullable: true }) duration: number;
}