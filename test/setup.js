import matchers from '@testing-library/jest-dom/matchers';
import { configure } from '@testing-library/dom';
import { expect } from 'vitest';

expect.extend(matchers);

configure({
	testIdAttribute: 'data-test',
});
