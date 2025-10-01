import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

const PERMISSIONS_KEY = Symbol("store-permissions-key");

export function Restrict(policy: Permission = "none"): any {
  return (target: any, propertyKey: string) => {
    const storeConstructor = target.constructor;
    if (!storeConstructor.hasOwnProperty(PERMISSIONS_KEY)) {
      storeConstructor[PERMISSIONS_KEY] = {}
    }
    storeConstructor[PERMISSIONS_KEY][propertyKey] = policy
  }
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";

  private _storeData: Record<string, JSONObject> = {}

  allowedToRead(key: string): boolean {
    const storeConstructor: any = this.constructor
    const permission = (storeConstructor[PERMISSIONS_KEY]?.[key]) || this.defaultPolicy
    return permission.includes("r")
  }

  allowedToWrite(key: string): boolean {
    const storeConstructor: any = this.constructor
    const permission = (storeConstructor[PERMISSIONS_KEY]?.[key]) || this.defaultPolicy
    return permission.includes("w")
  }

  read(path: string): StoreResult {
    const keys = path.split(":")
    let current: any = this
    let store: any = this

    for (const key of keys) {
      if (!store.allowedToRead(key)) {
        throw new Error(`Read permission missing for key: ${key}`);
      }
      let value = current[key]
      // if value is a function, call it
      if (value) value = typeof value === "function" ? value() : value

      // if value is not defined, check if it exists in _storeData
      if (!value && !!current._storeData?.[key]) value = current._storeData[key]

      // if value is a store, set store to value to get the correct permissions
      if (value instanceof Store) store = value

      // if value is not defined, the looked up field does not exist, return undefined
      if (!value) return undefined

      // update current node to keep traversing
      current = value
    }
    return current
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split(":")
    let current: any = this
    let store: any = this

    for (const key of keys.slice(0, -1)) {
      if (!store.allowedToRead(key)) {
        throw new Error(`Read permission missing for key: ${key}`);
      }
      // if value is not defined, check if it exists in _storeData
      let nextValue = current[key] ?? current._storeData?.[key];

      // if value is not defined, create a new store
      if (!nextValue) {
        nextValue = new Store();
        current[key] = nextValue;
      } else

        // if value exists in _storeData, set value to _storeData
        if (current._storeData?.[key] && !current[key]) {
          current[key] = current._storeData[key];
          nextValue = current[key];
        }

      // if value is a store, set store to value
      if (nextValue instanceof Store) {
        store = nextValue;
        current = nextValue;
      }
    }

    const lastKey = keys[keys.length - 1]

    if (!store.allowedToWrite(lastKey)) {
      throw new Error(`Write permission missing for key: ${lastKey}`);
    }

    // if value is an object, create a new store and write the object inside it
    if (typeof value === "object") {
      current[lastKey] = new Store()
      current[lastKey].writeEntries(value)
    }

    // if value is not an object, store the entry in the current store
    else {
      current[lastKey] = value
    }

    return value
  }


  writeEntries(entries: JSONObject): void {
    function writeEntriesRecursive(entries: JSONObject, current: any) {
      for (const [key, value] of Object.entries(entries)) {
        //if value is an object, create a new store and write the object inside it
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {

          // Create a new Store for nested objects
          const nestedStore = new Store()
          current._storeData[key] = nestedStore

          // Recursively process the nested object
          writeEntriesRecursive(value as JSONObject, nestedStore)
        } else {

          // Store primitive values or arrays directly
          current._storeData[key] = value
        }
      }
    }
    writeEntriesRecursive(entries, this)
  }

  entries(): JSONObject {
    const result: JSONObject = {};
    for (const [key, val] of Object.entries(this)) {
      if (this.allowedToRead(key)) {
        result[key] = typeof val === "function" ? val() : val;
      }
    }
    for (const [key, val] of Object.entries(this._storeData)) {
      if (this.allowedToRead(key)) {
        result[key] = val;
      }
    }
    return result;
  }
}
