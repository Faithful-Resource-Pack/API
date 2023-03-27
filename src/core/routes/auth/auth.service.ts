import { Injectable, NotAcceptableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from 'src/core/schemas/users.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private jwtService: JwtService) {}

  /**
   * Validate the user
   * @param {String} username User username
   * @param {String} password User password
   * @returns {Promise<User>}
   */
  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.usersService.findOneWithPassword({ username });
    if (!user) return null;

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!user) throw new NotAcceptableException('could not find the user');
    if (user && passwordValid) return user;
    return null;
  }

  /**
   * Create a JWT token for the user
   * @param {User} user User object
   * @returns {Promise<{ access_token: string }>} The JWT token
   */
  async login(user: any): Promise<{ access_token: string }> {
    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload, { secret: process.env.TOKEN_JWT }),
    };
  }

  /**
   * Verify the user account
   * @param {String} id User UUID
   * @param {String} token User verification token
   * @returns {Promise<boolean>} True if the user is verified
   */
  async verify(id: string, token: string): Promise<boolean> {
    return this.usersService.verify(id, token);
  }
}
