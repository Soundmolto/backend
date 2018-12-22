import { EntityRepository, Repository } from "typeorm";
import { User } from "../entity/User";

@EntityRepository(User)
export class UserRepository extends Repository<User> {

  public BukCreate(Samples: User[]): Promise<any> {
    return this.manager.createQueryBuilder().insert().into(User).values(Samples).execute();
  }

}
