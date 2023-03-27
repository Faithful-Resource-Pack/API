import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../routes/users/users.service';

@Injectable()
export class UsersRoutine {
  private readonly logger = new Logger(UsersRoutine.name);
  private readonly TIME_BEFORE_DELETION = 86400000; // 1 day

  constructor(private readonly userServices: UsersService) {}

  @Cron(CronExpression.EVERY_HOUR)
  handleCron() {
    this.logger.debug('Clearing unverified users...');

    this.userServices.findAll({ isVerified: false }).then((users) =>
      users.forEach((user) => {
        // if the user is older than 1 day
        if (user.createdAt.getTime() + this.TIME_BEFORE_DELETION < Date.now()) {
          this.logger.debug(`Deleting user ${user.username}...`);
          this.userServices.delete((user as any)._id);
        }
      }),
    );
  }
}
