/// <reference types="bun" />

import { strict as assert } from 'assert';
import { describe, it } from "bun:test";

describe('Exemple', () => {
    it('vérifie que vrai est vrai', () => {
        assert.equal(true, true);
    });
});