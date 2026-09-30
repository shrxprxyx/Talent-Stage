import { IsString, Matches } from 'class-validator';

export class PushTokenDto {
  @IsString()
  @Matches(/^Expo(nent)?PushToken\[.+\]$/, { message: 'Must be an Expo push token' })
  token: string;
}