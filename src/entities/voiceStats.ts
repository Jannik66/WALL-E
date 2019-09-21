import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('VoiceStats')
export class VoiceStats {
    @PrimaryGeneratedColumn() id: string;

    @Column('varchar') userID: string;

    @Column('varchar') voiceChannelID: string;

    @Column('datetime') joinedTimeStamp: Date;

    @Column({ type: 'datetime', nullable: true }) leftTimeStamp: Date;
}