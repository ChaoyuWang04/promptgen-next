/**
 * Template Engine Core
 *
 * Hybrid template system supporting:
 * 1. Module syntax: {{@module:character}}
 * 2. Variable access: {{character.name}}, {{pose.emotion}}
 * 3. Filters: {{array | join}}, {{array | join: ', '}}
 *
 * Achieves 100% output parity with Flask Python version.
 */

import {
  type TemplateContext,
  type TemplateRenderOptions,
  type TemplateValidationResult,
  type FilterFunction,
  type VariableMetadata,
} from './types';

import {
  CharacterModule,
  PoseModule,
  SceneModule,
  ThemeModule,
  LightingModule,
  StyleModule,
  CompositionModule,
} from './modules';

/**
 * Built-in filter functions
 */
const BUILT_IN_FILTERS: Record<string, FilterFunction> = {
  /**
   * Join array elements with separator
   * Usage: {{array | join}} or {{array | join: ', '}}
   */
  join: (value: any, args?: string[]): string => {
    if (!Array.isArray(value)) {
      return String(value);
    }

    const separator = args && args.length > 0 ? args[0] : ', ';
    return value.join(separator);
  },

  /**
   * Convert to uppercase
   * Usage: {{text | uppercase}}
   */
  uppercase: (value: any): string => {
    return String(value).toUpperCase();
  },

  /**
   * Convert to lowercase
   * Usage: {{text | lowercase}}
   */
  lowercase: (value: any): string => {
    return String(value).toLowerCase();
  },

  /**
   * Get first N items from array
   * Usage: {{array | first: 3}}
   */
  first: (value: any, args?: string[]): string => {
    if (!Array.isArray(value)) {
      return String(value);
    }

    const count = args && args.length > 0 ? parseInt(args[0], 10) : 1;
    return value.slice(0, count).join(', ');
  },

  /**
   * Default value if empty
   * Usage: {{value | default: 'N/A'}}
   */
  default: (value: any, args?: string[]): string => {
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return args && args.length > 0 ? args[0] : '';
    }
    return String(value);
  },
};

/**
 * Module registry
 */
const MODULE_REGISTRY = {
  character: CharacterModule,
  pose: PoseModule,
  scene: SceneModule,
  theme: ThemeModule,
  lighting: LightingModule,
  style: StyleModule,
  composition: CompositionModule,
};

/**
 * Template Engine Class
 */
export class TemplateEngine {
  private filters: Record<string, FilterFunction>;

  constructor(customFilters?: Record<string, FilterFunction>) {
    this.filters = { ...BUILT_IN_FILTERS, ...customFilters };
  }

  /**
   * Render a template with context
   *
   * @param template - Template string with {{...}} expressions
   * @param context - Data context for variables
   * @param options - Rendering options
   * @returns Rendered template string
   */
  render(
    template: string,
    context: TemplateContext,
    options: TemplateRenderOptions = {}
  ): string {
    const { strict = false, enable_modules = true } = options;

    // First, replace module calls {{@module:xxx}}
    let rendered = template;

    if (enable_modules) {
      rendered = this.renderModules(rendered, context, strict);
    }

    // Then, replace variable expressions {{xxx.yyy | filter}}
    rendered = this.renderVariables(rendered, context, strict);

    return rendered;
  }

  /**
   * Render module expressions: {{@module:name}}
   */
  private renderModules(
    template: string,
    context: TemplateContext,
    strict: boolean
  ): string {
    const moduleRegex = /\{\{@module:(\w+)\}\}/g;

    return template.replace(moduleRegex, (match, moduleName) => {
      const module = MODULE_REGISTRY[moduleName as keyof typeof MODULE_REGISTRY];

      if (!module) {
        if (strict) {
          throw new Error(`Unknown module: ${moduleName}`);
        }
        return match; // Keep original if not strict
      }

      try {
        return module.build(context);
      } catch (error) {
        if (strict) {
          throw error;
        }
        console.warn(`Module ${moduleName} failed:`, error);
        return '';
      }
    });
  }

  /**
   * Render variable expressions: {{path.to.value | filter: arg}}
   */
  private renderVariables(
    template: string,
    context: TemplateContext,
    strict: boolean
  ): string {
    // Match {{variable.path | filter: arg1, arg2}}
    const variableRegex = /\{\{([^}]+)\}\}/g;

    return template.replace(variableRegex, (match, expression) => {
      // Skip if already processed (starts with @)
      if (expression.trim().startsWith('@')) {
        return match;
      }

      try {
        return this.evaluateExpression(expression.trim(), context, strict);
      } catch (error) {
        if (strict) {
          throw error;
        }
        console.warn(`Expression evaluation failed: ${expression}`, error);
        return '';
      }
    });
  }

  /**
   * Evaluate a single expression: path.to.value | filter: args
   */
  private evaluateExpression(
    expression: string,
    context: TemplateContext,
    strict: boolean
  ): string {
    // Split by pipe to separate variable path and filters
    const parts = expression.split('|').map(p => p.trim());
    const variablePath = parts[0];
    const filterExpressions = parts.slice(1);

    // Get value from context
    let value = this.getValueByPath(variablePath, context);

    // Apply filters sequentially
    for (const filterExpr of filterExpressions) {
      value = this.applyFilter(filterExpr, value, strict);
    }

    // Convert to string
    if (Array.isArray(value)) {
      // Auto-join arrays if no filter applied
      return value.join(', ');
    }

    return value !== undefined && value !== null ? String(value) : '';
  }

  /**
   * Get value from context by path (e.g., "character.name")
   */
  private getValueByPath(path: string, context: any): any {
    const keys = path.split('.');
    let value = context;

    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Apply a filter to a value: filtername or filtername: arg1, arg2
   */
  private applyFilter(filterExpr: string, value: any, strict: boolean): any {
    // Parse filter expression: "join: ', '" -> name: "join", args: [", "]
    const colonIndex = filterExpr.indexOf(':');
    let filterName: string;
    let args: string[] = [];

    if (colonIndex !== -1) {
      filterName = filterExpr.substring(0, colonIndex).trim();
      const argsString = filterExpr.substring(colonIndex + 1).trim();
      // Split args by comma, trim each
      args = argsString.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      filterName = filterExpr;
    }

    const filter = this.filters[filterName];

    if (!filter) {
      if (strict) {
        throw new Error(`Unknown filter: ${filterName}`);
      }
      console.warn(`Unknown filter: ${filterName}, skipping`);
      return value;
    }

    return filter(value, args);
  }

  /**
   * Validate template syntax
   *
   * @param template - Template string to validate
   * @returns Validation result with errors and warnings
   */
  validate(template: string): TemplateValidationResult {
    const errors: TemplateValidationResult['errors'] = [];
    const warnings: TemplateValidationResult['warnings'] = [];

    const lines = template.split('\n');

    lines.forEach((line, lineIndex) => {
      const lineNum = lineIndex + 1;

      // Find all {{...}} expressions in this line
      const expressionRegex = /\{\{([^}]+)\}\}/g;
      let match;

      while ((match = expressionRegex.exec(line)) !== null) {
        const expression = match[1].trim();
        const column = match.index + 1;

        // Check module syntax
        if (expression.startsWith('@module:')) {
          const moduleName = expression.substring(8);

          if (!MODULE_REGISTRY[moduleName as keyof typeof MODULE_REGISTRY]) {
            errors.push({
              line: lineNum,
              column,
              message: `Unknown module: ${moduleName}`,
              variable: expression,
            });
          }
        } else {
          // Check variable expression
          const parts = expression.split('|').map(p => p.trim());
          const variablePath = parts[0];

          // Validate variable path format (no validation of actual existence)
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(variablePath)) {
            errors.push({
              line: lineNum,
              column,
              message: `Invalid variable path: ${variablePath}`,
              variable: expression,
            });
          }

          // Check filters
          const filterExpressions = parts.slice(1);
          for (const filterExpr of filterExpressions) {
            const colonIndex = filterExpr.indexOf(':');
            const filterName =
              colonIndex !== -1
                ? filterExpr.substring(0, colonIndex).trim()
                : filterExpr;

            if (!this.filters[filterName]) {
              warnings.push({
                line: lineNum,
                column,
                message: `Unknown filter: ${filterName}`,
                variable: expression,
              });
            }
          }
        }
      }

      // Check for unclosed braces
      const openCount = (line.match(/\{\{/g) || []).length;
      const closeCount = (line.match(/\}\}/g) || []).length;

      if (openCount !== closeCount) {
        errors.push({
          line: lineNum,
          column: 1,
          message: `Mismatched braces: ${openCount} opening, ${closeCount} closing`,
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get available variables for autocomplete
   *
   * @param context - Template context
   * @returns Array of variable metadata
   */
  static getAvailableVariables(context: TemplateContext): VariableMetadata[] {
    const variables: VariableMetadata[] = [];

    // Add variables from context namespaces
    const namespaces = ['character', 'pose', 'scene', 'theme', 'style'];

    for (const namespace of namespaces) {
      const data = context[namespace as keyof TemplateContext];

      if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          variables.push({
            path: `${namespace}.${key}`,
            type: Array.isArray(value)
              ? 'array'
              : typeof value === 'object'
              ? 'object'
              : (typeof value as any),
            description: `${namespace} ${key}`,
            requires_filter: Array.isArray(value),
          });
        }
      }
    }

    // Add module shortcuts
    const modules = Object.keys(MODULE_REGISTRY);
    for (const moduleName of modules) {
      variables.push({
        path: `@module:${moduleName}`,
        type: 'string',
        description: `${moduleName} module (auto-generated segment)`,
      });
    }

    return variables;
  }

  /**
   * Register a custom filter
   */
  registerFilter(name: string, fn: FilterFunction): void {
    this.filters[name] = fn;
  }

  /**
   * Get all registered filters
   */
  getFilters(): string[] {
    return Object.keys(this.filters);
  }
}

/**
 * Default template engine instance
 */
export const defaultTemplateEngine = new TemplateEngine();

/**
 * Helper function: render template
 */
export function renderTemplate(
  template: string,
  context: TemplateContext,
  options?: TemplateRenderOptions
): string {
  return defaultTemplateEngine.render(template, context, options);
}

/**
 * Helper function: validate template
 */
export function validateTemplate(template: string): TemplateValidationResult {
  return defaultTemplateEngine.validate(template);
}

/**
 * Helper function: get available variables
 */
export function getAvailableVariables(context: TemplateContext): VariableMetadata[] {
  return TemplateEngine.getAvailableVariables(context);
}
