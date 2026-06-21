import { validate } from 'class-validator';
import { IsOptional } from 'class-validator';

// Mock @stellar/stellar-sdk before importing the validator
jest.mock('@stellar/stellar-sdk', () => ({
  StrKey: {
    isValidEd25519PublicKey: (value: string) =>
      typeof value === 'string' && value.length === 55 && /^G[A-Z2-7]{54}$/.test(value),
  },
}));

import { IsStellarAddress } from './stellar-address.validator';

class TestDto {
  @IsOptional()
  @IsStellarAddress()
  authorAddress?: string;
}

const VALID_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

describe('IsStellarAddress', () => {
  it('passes with a valid Stellar public key', async () => {
    const dto = Object.assign(new TestDto(), { authorAddress: VALID_ADDRESS });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes when authorAddress is absent (anonymous post)', async () => {
    const errors = await validate(new TestDto());
    expect(errors).toHaveLength(0);
  });

  it('fails with an invalid string', async () => {
    const dto = Object.assign(new TestDto(), { authorAddress: 'not-a-stellar-key' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isStellarAddress).toBe(
      'authorAddress must be a valid Stellar public key',
    );
  });

  it('fails with an address that does not start with G', async () => {
    const dto = Object.assign(new TestDto(), { authorAddress: 'XAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('fails with an empty string', async () => {
    const dto = Object.assign(new TestDto(), { authorAddress: '' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });
});
