import { BaseEntity, Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Contact, Identity, Track } from '../interfaces';
import { User } from './User';

@Entity('labels')
export class Label extends BaseEntity {

	public static find_by_id (id: string): Promise<Label[]> {
		return this.find({ where: { id } });
	}

	public static find_by_vanity_url (url: string): Promise <Label[]> {
	return this.find({ where: { url } });
	}

	@PrimaryGeneratedColumn('uuid')
	public id: string;

	@Column('simple-json')
	public identity: Identity;

	@Column('simple-json')
	public contact: Contact;

	@ManyToMany(() => User, { eager: true })
	@JoinTable()
	public artists: User[];

	@Column('simple-json')
	public tracks: Track[];

	@Column('text', { select: false })
	public url: string;

}
