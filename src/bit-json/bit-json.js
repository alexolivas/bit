/** @flow */
import path from 'path';
import fs from 'fs';
import { BitIds } from '../bit-id';
import { BitJsonAlreadyExists, BitJsonNotFound } from './exceptions';
import { Remotes } from '../remotes';
import { 
  BIT_JSON,
  DEFAULT_COMPILER,
  DEFAULT_TESTER,
  DEFAULT_BIT_VERSION,
  DEFAULT_BOX_NAME,
  IMPL_FILE_NAME,
  SPEC_FILE_NAME,
  DEFAULT_BIT_NAME,
} from '../constants';

function composePath(bitPath: string) {
  return path.join(bitPath, BIT_JSON);
}

function hasExisting(bitPath: string): boolean {
  return fs.existsSync(composePath(bitPath));
}

export type BitJsonProps = {
  name?: string;
  box?: string;
  sources?: {
    impl?: string;
    spec?: string;  
  };
  env?: {
    compiler?: string;
    tester?: string;
  };
  version?: string;
  remotes?: Object;
  dependencies?: Object;
};

export default class BitJson {
  /**
   * dependencies in bit json
   **/
  name: string;
  box: string;
  version: string;
  dependencies: {[string]: string};
  remotes: {[string]: string};
  sources: {
    impl: string;
    spec: string;  
  };
  env: {
    compiler: string;
    tester: string;
  };

  getPath(bitPath: string) {
    return composePath(bitPath);
  }

  constructor(
    { name, box, version, sources, dependencies, remotes, env }: BitJsonProps
    ) {
    this.name = name || DEFAULT_BIT_NAME;
    this.box = box || DEFAULT_BOX_NAME;
    this.sources = {
      impl: sources ? sources.impl || IMPL_FILE_NAME : IMPL_FILE_NAME,
      spec: sources ? sources.spec || SPEC_FILE_NAME : SPEC_FILE_NAME,
    };
    this.env = {
      compiler: env ? env.compiler || DEFAULT_COMPILER : DEFAULT_COMPILER,
      tester: env ? env.tester || DEFAULT_TESTER : DEFAULT_TESTER,
    };
    this.version = version || DEFAULT_BIT_VERSION;
    this.remotes = remotes || {};
    this.dependencies = dependencies || {};
  }

  /**
   * add dependency
   */
  addDependency(name: string, version: string) {
    this.dependencies[name] = version;
  }

  /**
   * remove dependency
   */
  removeDependency(name: string) {
    delete this.dependencies[name];
  } 

  /**
   * check whether dependency exists
   */
  hasDependency(name: string) {
    return !!this.dependencies[name];
  }

  /**
   * convert to plain object
   */
  toPlainObject() {
    return {
      name: this.name,
      box: this.box,
      version: this.version,
      sources: {
        impl: this.getImplBasename(),
        spec: this.getSpecBasename(),
      },
      env: {
        compiler: this.getCompilerName(),
        tester: this.getTesterName(),
      },
      remotes: this.getRemotes().toPlainObject(),
      dependencies: this.dependencies
    };
  }
  
  getImplBasename(): string { 
    return this.sources.impl;
  }

  getSpecBasename(): string { 
    return this.sources.spec;
  }

  getCompilerName(): string { 
    return this.env.compiler;
  }

  getTesterName(): string { 
    return this.env.tester;
  }

  getRemotes(): Remotes {
    return Remotes.load(this.remotes);
  }

  getDependencies(): BitIds {
    return BitIds.loadDependencies(this.dependencies);
  }

  /**
   * convert to json
   */  
  toJson(readable: boolean = true) {
    if (!readable) return JSON.stringify(this.toPlainObject());
    return JSON.stringify(this.toPlainObject(), null, 4);
  }

  /**
   * write to file as json
   */
  write({ bitDir, override = true }: { bitDir: string, override?: boolean }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!override && hasExisting(bitDir)) {
        throw new BitJsonAlreadyExists();
      }

      const repspond = (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      };

      fs.writeFile(
        composePath(bitDir),
        this.toJson(),
        repspond
      );
    });
  }

  getDependencies() {

  }

  validate(): boolean {
    return (true
      // typeof this.version === 'number' &&
      // typeof this.compiler === 'string' &&
      // this.remotes.validate() &&
      // typeof this.dependencies === 'object'
    );
  }
  
  // getRemote(name: string) {
    // return this.remotes.get(name);
  // }

  static loadFromRaw(json: Object) {
    return new BitJson(json);
  }

  /**
   * load existing json in root path
   */
  static load(dirPath: string): Promise<BitJson> {
    return new Promise((resolve, reject) => {
      if (!hasExisting(dirPath)) return reject(new BitJsonNotFound());
      return fs.readFile(composePath(dirPath), (err, data) => {
        if (err) return reject(err);
        const file = JSON.parse(data.toString('utf8'));
        return resolve(new BitJson(file));
      });
    });
  }
}
