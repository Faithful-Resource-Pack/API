import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../routes/users/users.service';
import { SendDiscordWebhook } from 'src/utils/SendDiscordWebhook';

@Injectable()
export class UsersRoutine {
  private readonly TIME_BEFORE_DELETION = 86400000; // 1 day

  constructor(private readonly userServices: UsersService) {}

  @Cron(CronExpression.EVERY_HOUR)
  handleCron() {
    this.userServices.findAll({ isVerified: false }).then((users) =>
      users.forEach((user) => {
        // if the user is older than 1 day
        if (user.createdAt.getTime() + this.TIME_BEFORE_DELETION < Date.now()) {
          this.userServices.delete((user as any)._id);

          SendDiscordWebhook(undefined, [
            {
              type: 'rich',
              title: 'An unverified user has been deleted',
              description: 'This user has been deleted because he did not verify his account within 1 day.',
              fields: [
                {
                  name: 'Username',
                  value: user.username,
                  inline: true,
                },
                {
                  name: 'Account Created At',
                  value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:f>`,
                  inline: true,
                },
                {
                  name: 'Account Deleted At',
                  value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
                  inline: true,
                },
              ],
              color: 0xdc143c,
            },
          ]);
        }
      }),
    );
  }
}
