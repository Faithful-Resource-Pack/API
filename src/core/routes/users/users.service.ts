import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from 'src/core/dto/users.dto';
import { User, UserDocument } from 'src/core/schemas/users.schema';
import { ROLES } from 'src/core/decorators/roles.decorator';
import { HTTPException } from 'src/types';
import SendDiscordWebhook, { DiscordEmbedColors } from 'src/utils/SendDiscordWebhook';
import * as nodemailer from 'nodemailer';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    sender: 'contact@faithfulpack.net',
    auth: {
      user: process.env.EMAIL_SENDER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  /**
   * Delete a user by id
   * @param {string} id User UUID
   * @param {string} reason The reason why the user has been deleted
   * @returns {Promise<User>} The deleted user object
   */
  async delete(id: string, reason: string): Promise<User> {
    const user = await this.userModel.findByIdAndDelete(id, { email: true }).exec();

    // email body
    const mailOptions = {
      from: 'contact@faithfulpack.net',
      to: user.email,
      subject: 'Faithful - Account Deletion',
      text:
        `Your account has been deleted from the database. Everything related to your account has been anonymized.\n` +
        `If you did not request this, please contact us at the following email : contact@faithfulpack.net\n\n` +
        `Thanks,\n` +
        `The Faithful Team`,
    };

    // send the account deletion email
    await this.transporter.sendMail(mailOptions);

    SendDiscordWebhook({
      embeds: [
        {
          type: 'rich',
          title: user.isVerified ? 'A user has been deleted' : 'An unverified user has been deleted',
          description: reason === ',' ? 'No reason provided' : reason,
          fields: [
            {
              name: 'Username',
              value: user.username,
              inline: true,
            },
            {
              name: 'UUID',
              value: `\`${user._id.toString()}\``,
              inline: true,
            },
            {
              name: 'Email',
              value: user.email,
              inline: true,
            },
            {
              name: 'Verified',
              value: user.isVerified ? 'Yes' : 'No',
              inline: true,
            },
            {
              name: 'Roles',
              value: user.roles.join(', '),
              inline: true,
            },
            {
              name: 'Created At',
              value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:f>`,
              inline: true,
            },
            {
              name: 'Last Updated At',
              value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:f>`,
              inline: true,
            },
            {
              name: 'Deleted At',
              value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
              inline: true,
            },
          ],
          color: DiscordEmbedColors.RED,
        },
      ],
    });

    return user;
  }

  /**
   * Remove a role from a user
   * @param {string} id User UUID
   * @param {ROLES} role Role to remove
   * @returns {Promise<User>} The updated user object
   */
  async deleteRole(id: string, role: ROLES): Promise<User> {
    const user = await this.userModel.findOne({ _id: id });

    // check if user exist
    if (!user) throw new Error(`User with id '${id}' doesn't exist`);

    // check if the role is valid
    if (Object.values(ROLES).includes(role) === false)
      throw new Error(`Invalid role, must be one of: ${Object.values(ROLES).join(', ')}`);

    if (user.roles.includes(role)) user.roles = user.roles.filter((r) => r !== role);

    SendDiscordWebhook({
      embeds: [
        {
          type: 'rich',
          title: 'A user has been revoked a role',
          description: `The user ${user.username} has been revoked the role ${role}.`,
          fields: [
            {
              name: 'UUID',
              value: `\`${user._id.toString()}\``,
              inline: true,
            },
            {
              name: 'Roles',
              value: user.roles.join(', '),
              inline: true,
            },
          ],
          color: DiscordEmbedColors.RED,
        },
      ],
    });

    return user.save();
  }

  /**
   * Add a role to a user
   * @param {string} id User UUID
   * @param {ROLES} role Role to add
   * @returns {Promise<User>} The updated user object
   */
  async addRole(id: string, role: ROLES): Promise<User> {
    const user = await this.userModel.findOne({ _id: id });

    // check if user exist
    if (!user) throw new Error(`User with id '${id}' doesn't exist`);

    // check if the role is valid
    if (Object.values(ROLES).includes(role) === false)
      throw new Error(`Invalid role, must be one of: ${Object.values(ROLES).join(', ')}`);

    // avoid duplicate roles
    if (user.roles.includes(role)) user.roles = user.roles.filter((r) => r !== role);
    user.roles = [...user.roles, role];

    SendDiscordWebhook({
      embeds: [
        {
          type: 'rich',
          title: 'A user has been granted a new role',
          description: `The user ${user.username} has been granted the role ${role}.`,
          fields: [
            {
              name: 'UUID',
              value: `\`${user._id.toString()}\``,
              inline: true,
            },
            {
              name: 'Roles',
              value: user.roles.join(', '),
              inline: true,
            },
          ],
          color: DiscordEmbedColors.GREEN,
        },
      ],
    });

    return user.save();
  }

  /**
   * Verify a user's email address
   * @param {string} id UUID of the user
   * @param {string} token Token sent to the user's email address
   * @returns {Promise<boolean>} True if the user was verified, false otherwise
   */
  async verify(id: string, token: string): Promise<boolean> {
    const user = await this.userModel.findOne({ _id: id });
    if (!user) return false;
    if (user.isVerified) return true;
    if (user.verificationToken !== token) return false;

    user.isVerified = true;
    user.verificationToken = undefined;
    user.save();
    return true;
  }

  /**
   * Create a new user and send a verification email
   * @param {CreateUserDto} createUserDto User creation parameters
   * @param {string} redirectUrl URL to redirect the user to after verification
   * @returns {Promise<User>} The newly created user object
   */
  async createUser(createUserDto: CreateUserDto, redirectUrl: string): Promise<User | HTTPException> {
    // generate a random token for email verification
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // prepare the user object
    const user = new this.userModel({
      username: createUserDto.username,
      password: createUserDto.password,
      email: createUserDto.email,
      isVerified: false,
      verificationToken,
    });

    // check if the user already exists
    let res: User;
    try {
      res = await user.save();
    } catch (err: any) {
      if (err.code === 11000) return { message: 'Username or email already exists', status: HttpStatus.BAD_REQUEST };
      return { message: err.message, status: HttpStatus.BAD_REQUEST };
    }

    console.log(redirectUrl, encodeURIComponent(redirectUrl));

    // email body
    const verifyURL = process.env.DEV === 'false' ? 'https://api.faithfulpack.net' : 'http://localhost:3000' + '/auth/verify';
    const mailOptions = {
      from: 'contact@faithfulpack.net',
      to: createUserDto.email,
      subject: 'Faithful - Account Email Verification',
      text:
        `Please verify your email address by clicking the link below:\n` +
        `${verifyURL}/${user._id}/${verificationToken}/${encodeURIComponent(redirectUrl)}\n` +
        `If you do not verify your email address within 24 hours, your account will be deleted.\n\n` +
        `If you did not request this, please ignore this email.\n\n` +
        `Thanks,\n` +
        `The Faithful Team`,
    };

    // send the verification email
    await this.transporter.sendMail(mailOptions);

    // return the user object
    return res;
  }

  /**
   * Find all users with specific parameters
   * @param {Object} query The query to search users for
   * @returns {Promise<User[]> | []} The user objects or an empty array if none found
   */
  async findAll(query: object): Promise<User[]> {
    return this.userModel.find(query).exec();
  }

  /**
   * Find a user with specific parameters
   * @param {Object} query The query to search for
   * @returns {Promise<User> | null} The user object or undefined if not found
   */
  async findOne(query: object): Promise<User | null> {
    return this.userModel.findOne(query).exec();
  }

  /**
   * Find a user with specific parameters, including the password
   * @param {Object} query The query to search for
   * @returns {Promise<User> | Undefined} The user object or undefined if not found
   */
  async findOneWithPassword(query: object): Promise<User | undefined> {
    return this.userModel.findOne(query, { password: true }).exec();
  }
}
