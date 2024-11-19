import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from 'src/common/database';
import { User, UserDocument } from 'src/user/schemas/user.schema';

@Injectable()
export class AuthRepository extends AbstractRepository<UserDocument> {
  protected readonly logger = new Logger(AuthRepository.name);

  constructor(@InjectModel(User.name) userModel: Model<UserDocument>) {
    super(userModel);
  }
}