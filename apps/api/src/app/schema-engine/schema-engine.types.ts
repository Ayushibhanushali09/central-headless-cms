export interface ValidationIssue {
  path: string;
  keyword: string;
  message: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  schemaHash: string | null;
  errors: ValidationIssue[];
}

export interface ContentValidationResult {
  valid: boolean;
  schemaHash: string | null;
  errors: ValidationIssue[];
}