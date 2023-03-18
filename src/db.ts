import Dexie, { Table } from 'dexie';

export interface Prompt {
  id?: number;
  title: string;
  text: string;
}

export class MySubClassedDexie extends Dexie {
  prompts!: Table<Prompt>;

  constructor() {
    super('db');
    this.version(1).stores({
      prompts: '++id, title, text',
    });
  }
}

export const db = new MySubClassedDexie();
