import { Equals, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @Equals('Удалить', {
    message: 'Confirmation must exactly match Удалить',
  })
  confirmation!: string;
}
