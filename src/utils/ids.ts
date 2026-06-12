import { v7 as uuidv7, validate as uuidValidate } from 'uuid';

/**
 * UUID v7: time-ordered, monotonic, ideal for primary keys + correlation IDs.
 * Avoid v4 for anything that's indexed.
 */
export const newId = (): string => uuidv7();

export const isUuid = (value: string): boolean => uuidValidate(value);
