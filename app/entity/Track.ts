import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity('tracks')
export class Track extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column('text')
  public downloadable: string;

  @Column('text')
  public name: string;

  @Column('text')
  public url: string;

  @Column('text')
  public artwork: string;

  @Column('text')
  public stream_url: string;

  @Column('integer')
  public plays: number;

  @Column('text')
  public visibility: string;

  @Column('text', { select: false })
  public secret_key: string;

  @ManyToOne(() => User, (user: User) => user.tracks)
  public user: User;

  @Column('text', { select: true })
  public owner: string;

  @Column('float')
  public duration: number;

  @Column('varchar')
  public createdAt: number;

  @Column('varchar', { select: false })
  public waveform_location: string;

  @Column('text')
  public waveform_url: string;

  @Column('integer')
  public amountOfLikes: number;

  @Column('text', { select: false })
  public canDeleteFile: string;

  @Column('simple-array')
  public genres: string[];

  @Column('text', { select: false })
  public hash: string;

  @Column('text')
  public description: string;

  @Column('text')
  public storageLocation: string;

}
