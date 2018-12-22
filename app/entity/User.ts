import {
	BaseEntity,
	Column,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../enums/UserRole';
import { Profile } from './Profile';
import { Track } from './Track';

@Entity('users')
export class User extends BaseEntity {

	public static findOneById (id: string): Promise<User> {
		return this.findOne({ where: { id }});
	}

	public static find_by_id (id: string): Promise<User[]> {
		return this.find({ where: { id } });
	}

	public static find_by_email (email: string): Promise<User> {
		return this.findOne({ where: { email } });
	}

	public static async login (email: string, password: string): Promise <User> {
		return this.findOne({ where: { email }, select: ['password', 'email', 'role'] });
	}

	public static find_by_vanity_url (url: string): Promise <User[]> {
		return this.find({ where: { url } });
	}

	@PrimaryGeneratedColumn('uuid')
	public id: string;

	@Column('varchar')
	public createdAt: number;

	@Column('text', { select: false })
	public email: string;

	@Column('text', { select: false })
	public password: string;

	@ManyToMany(() => Profile, { eager: true })
	@JoinTable()
	public following: Profile[];

	@ManyToMany(() => Profile, { eager: true })
	@JoinTable()
	public followers: Profile[];

	@OneToOne(() => Profile, { eager: true })
	@JoinColumn()
	public profile: Profile;

	@OneToMany(() => Track, (track: Track) => track.user, { eager: true, cascade: true })
	public tracks: Track[];

	@Column('text', { select: false })
	public url: string;

	@Column('text')
	public verified: string;

	@Column('text', { select: false })
	public role: UserRole;

	@ManyToMany(() => Track, { eager: true, cascade: true })
	@JoinTable()
	public likes: Track[];

	@ManyToMany(() => Track, { lazy: true, cascade: true })
	@JoinTable()
	public collection: Promise<Track[]> | Track[];

	/**
	 * Simple method to abstract implementation of verified flag
	 */
	public get is_verified () {
		return 'true' === this.verified;
	}

}
