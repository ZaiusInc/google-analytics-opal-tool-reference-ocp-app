import { ToolFunction } from '@optimizely-opal/opal-tool-ocp-sdk';

// Tool registration: The @tool decorator automatically registers tools when
// the module is imported. Each tool class must be imported here to register
// its tools with the function. See SDK docs for details.
import '../tools/TodayDateTool';

/**
 * Class that implements the Opal tool functions.
 */
export class OpalToolFunction extends ToolFunction {

  /**
   * Optional: Override the ready() method to check if the function is ready to process requests
   * The /ready endpoint will call this method and return the status
   */
  protected async ready(): Promise<boolean> {
    // Add any initialization checks here
    // For example: check if external services are available, configuration is valid, etc.
    return true;
  }

}
