// pages/content/src/utils/instructionGenerator.ts
import { chatgptInstructions } from './website_specific_instruction/chatgpt';
import { geminiInstructions } from './website_specific_instruction/gemini';

/**
 * Generates markdown instructions for using MCP tools based on available tools
 * @param tools Array of available tools with their schemas
 * @param customInstructions Optional custom instructions to include
 * @param customInstructionsEnabled Whether custom instructions should be included
 * @returns Markdown formatted instructions
 */
export const generateInstructions = (
  tools: Array<{ name: string; schema: string; description: string }>,
  customInstructions?: string,
  customInstructionsEnabled?: boolean,
): string => {
  if (!tools || tools.length === 0) {
    return '# Tools unavailable\n\nConnect to the MCP server then retry.';
  }

  let instructions = `### System Prompt: Tool Invocation Protocol

1. Structure Definition
*   1.1. Enclose the output in one \`xml\` codeblock.
*   1.2. Nest one \`<function_calls>\` block within the \`xml\` codeblock.
*   1.3. Nest one \`<invoke>\` tag within the \`<function_calls>\` block.
*   1.4. Nest one \`<parameter>\` tag per required argument within the \`<invoke>\` tag.

2. Attribute Assignment
*   2.1. Set the \`name\` attribute of the \`<invoke>\` tag to the function's name.
*   2.2. Set the \`call_id\` attribute of the \`<invoke>\` tag to an incrementing integer, starting at 1.
*   2.3. Set the \`name\` attribute of each \`<parameter>\` tag to the argument's name.

3. Value Formatting
*   3.1. Write each argument's value between its \`<parameter>\` tags.
*   3.2. Write string and scalar values as-is.
*   3.3. Format list and object values as JSON strings.

### Output Format
Plan ahead before sending the function call.

## Function Calls
- Reasoning: [Which functions could solve your problems?]
- function_name: […]
- call_id: […]

\`\`\`xml
<function_calls>
<invoke name="$FUNCTION_NAME" call_id="$CALL_ID">
<parameter name="$PARAMETER_NAME_1">$PARAMETER_VALUE</parameter>
</invoke>
</function_calls>
\`\`\`

`;

  const currentHost = window.location.hostname;
  if (currentHost.includes('gemini')) {
    instructions += geminiInstructions;
  }

  if (currentHost.includes('chatgpt')) {
    instructions += chatgptInstructions;
  }

  instructions += '## Tools available\n\n';

  tools.forEach(tool => {
    instructions += ` - ${tool.name}\n`;

    try {
      const schema = JSON.parse(tool.schema);

      if (tool.description) {
        instructions += `Description: ${tool.description}\n`;
      }

      if (schema.properties && Object.keys(schema.properties).length > 0) {
        instructions += 'Parameters:\n';

        const requiredParams = Array.isArray(schema.required) ? schema.required : [];
        Object.entries(schema.properties).forEach(([paramName, paramDetails]: [string, any]) => {
          const isRequired = requiredParams.includes(paramName);
          instructions += `- \`${paramName}\`: ${paramDetails.description ? paramDetails.description : ''} (${paramDetails.type || 'any'}) (${isRequired ? 'required' : 'optional'})\n`;

          if (paramDetails.type === 'object' && paramDetails.properties) {
            instructions += '  - Properties:\n';
            Object.entries(paramDetails.properties).forEach(([nestedName, nestedDetails]: [string, any]) => {
              instructions += `    - \`${nestedName}\`: ${nestedDetails.description || 'No description'} (${nestedDetails.type || 'any'})\n`;
            });
          }

          if (
            paramDetails.type === 'array' &&
            paramDetails.items &&
            paramDetails.items.type === 'object' &&
            paramDetails.items.properties
          ) {
            instructions += '  - Array items (objects) with properties:\n';
            Object.entries(paramDetails.items.properties).forEach(([itemName, itemDetails]: [string, any]) => {
              instructions += `    - \`${itemName}\`: ${itemDetails.description || 'No description'} (${itemDetails.type || 'any'})\n`;
            });
          }
        });

        instructions += '\n';
      }
    } catch (error) {
      instructions += 'Tools and schema information unavailable.';
    }
  });

  if (customInstructionsEnabled && customInstructions && customInstructions.trim()) {
    instructions += '<custom_instructions>\n';
    instructions += customInstructions.trim();
    instructions += '\n</custom_instructions>\n\n';
  }

  instructions += '\n\n---\n\nThis section delimits the system prompt from the user prompt.\n\n---\n\n';
  
  return instructions;
};
