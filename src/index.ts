import ts from 'typescript';
import path from 'path';

/**
 * Name of the directive to get the source filename.
 * 
 * Should line up with interfaces.ts.
 */
const filenameDirective = 'FILE_NAME';
/**
 * Name of the directive to get the current function name.
 * 
 * Should line up with interfaces.ts.
 */
const functionDirective = 'FUNCTION_NAME';
/**
 * Name of the namespace housing the proprocessing directives.
 * 
 * Should line up with interfaces.ts.
 */
const preprocessorGlobalName = 'preprocessor';
/**
 * Value that should be used if function name cannot be found.
 */
const defaultIfNotFound = '(unknown)';

/**
 * Creates a TransformerFactory for use by 'ttypescript' compiler.
 * @param checker Type checker
 * @returns The Transformer to be used.
 */
export default function (checker: ts.TypeChecker): ts.TransformerFactory<ts.SourceFile> {
    let sourceFile: ts.SourceFile;

    return context => {
        const visit: ts.Visitor = node => {
            if (ts.isSourceFile(node)) {
                sourceFile = node;
            }
    
            node = ts.visitEachChild(node, visit, context);

            try {
                if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && ts.isIdentifier(node.name)) {
                    const preprocMod = node.expression;
                    const preprocIdent = node.name;

                    if (preprocMod.getText() === preprocessorGlobalName) {
                        const preprocModSymbol = checker.getSymbolAtLocation(preprocMod);
                        const preprocIdentSymbol = checker.getSymbolAtLocation(preprocIdent);
    
                        if (preprocModSymbol && preprocModSymbol.getFlags() & ts.SymbolFlags.Module
                            && preprocIdentSymbol && preprocIdentSymbol.getFlags() & ts.SymbolFlags.ModuleMember) {
                            if (preprocIdent.getText() === filenameDirective) {
                                return ts.createStringLiteral(path.basename(sourceFile.fileName));
                            }
        
                            if (preprocIdent.getText() === functionDirective) {
                                const p = findParentMethod(node);

                                if (p !== null && p.name) {
                                    return ts.createStringLiteral(p.name.getText());
                                }
    
                                return ts.createStringLiteral(defaultIfNotFound);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('ts-transform-log-helper :: an error occurred during transformation:', err);
                console.trace('ts-transform-log-helper :: the node text that failed:', node);
            }
    
            return node;
        }
    
        return node => ts.visitNode(node, visit);
    }
}

/**
 * Finds the parent method node of a given node (if there is one).
 * @param node The node to find the parent of.
 * @returns The node of the parent method.
 */
function findParentMethod (node: ts.Node) {
    let parent = node.parent;
    while (parent) {
        if (ts.isMethodDeclaration(parent) || ts.isGetAccessor(parent) || ts.isSetAccessor(parent) || ts.isFunctionDeclaration(parent)) {
            return parent;
        }

        parent = parent.parent;
    }

    return null;
}
