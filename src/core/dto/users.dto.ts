import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    required: true,
    description: 'The username of the user',
  })
  username: string;

  @ApiProperty({
    required: true,
    description: 'The password of the user',
  })
  password: string;

  @ApiProperty({
    required: true,
    description: 'The email of the user',
  })
  email: string;
}
