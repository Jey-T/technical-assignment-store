import { Store } from "./store";
import { Restrict } from "./utils/decorators";

export class UserStore extends Store {
  @Restrict("rw")
  name: string = "John Doe";

  constructor() {
    super();
    this.defaultPolicy = "rw";
  }
}
