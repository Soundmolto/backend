import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('reports')
export class Report extends BaseEntity {

	@PrimaryGeneratedColumn('uuid')
	public id: string;

	@Column('text')
	public reporterId: string;

	@Column('text')
	public reportedUserId?: string;

	@Column('text')
	public reportedTrackId?: string;

	@Column('text')
	public evidence: string;

	@Column('text')
	public entity: 'track' | 'user';

	@Column('text')
	public intermediaryId?: string|null;

}
