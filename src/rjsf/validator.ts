import Ajv, { type Options, type Ajv as AjvInstance } from "ajv";
import addFormats from "ajv-formats";
import AJV8Validator from "@rjsf/validator-ajv8";

// Configure AJV
const ajvOptions: Options = {
  strict: false,
  allErrors: true,
  allowUnionTypes: true,
  verboseError: true,
};
const ajv: AjvInstance = new Ajv(ajvOptions);
addFormats(ajv);

// Export an RJSF validator
export const rjsfValidator = AJV8Validator<any>(ajv);
