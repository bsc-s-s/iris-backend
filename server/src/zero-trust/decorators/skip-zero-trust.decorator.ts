import { SetMetadata } from '@nestjs/common';

export const SKIP_ZERO_TRUST_KEY = 'skipZeroTrust';
export const SkipZeroTrust = () => SetMetadata(SKIP_ZERO_TRUST_KEY, true);
