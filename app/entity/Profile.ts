import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Profile {

	@Column('varchar', { unique: true })
	@PrimaryGeneratedColumn('uuid')
	public id: string;

	@Column('varchar', { unique: true })
	public url: string;

	@Column('varchar')
	public displayName: string;

	@Column('varchar')
	public location: string;

	@Column('varchar')
	public description: string;

	@Column('varchar')
	public bio: string;

	@Column('varchar')
	public profilePicture: string;

	@Column('varchar')
	public firstName: string;
}
