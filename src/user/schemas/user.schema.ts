import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { RoleTypes, StatusUser } from 'src/common/types/user.enum';


export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop()
  username: string;

  @Prop({ default: 'https://avatar.iran.liara.run/public' })
  avatar: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: RoleTypes, default: RoleTypes.Admin })
  role: string;

  @Prop({ enum: StatusUser, default: StatusUser.OFFLINE })
  status: string;


}

export const UserSchema = SchemaFactory.createForClass(User);
 