import ast
import operator
import math
import random

# Supported operators
OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod
}

def safe_eval_math(expr: str, variables: dict = None):
    if variables is None:
        variables = {}
    
    def _eval(node):
        if isinstance(node, ast.Num):
            return node.n
        elif isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.Name):
            if node.id in variables:
                return variables[node.id]
            raise ValueError(f"Undefined variable: {node.id}")
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            if type(node.op) in OPERATORS:
                return OPERATORS[type(node.op)](left, right)
            raise ValueError(f"Unsupported operator: {type(node.op)}")
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            if type(node.op) in OPERATORS:
                return OPERATORS[type(node.op)](operand)
            raise ValueError(f"Unsupported unary operator: {type(node.op)}")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
                args = [_eval(arg) for arg in node.args]
                if func_name == "round":
                    return round(*args)
                elif func_name == "abs":
                    return abs(*args)
                elif func_name == "int":
                    return int(*args)
                elif func_name == "float":
                    return float(*args)
            raise ValueError("Unsupported function call")
        else:
            raise ValueError(f"Unsupported expression node: {type(node)}")
            
    try:
        parsed = ast.parse(str(expr), mode='eval')
        return _eval(parsed.body)
    except Exception as e:
        raise ValueError(f"Error evaluating expression '{expr}': {e}")

def generate_parameters(config: dict):
    """
    config structure:
    {
        "variables": [
            {"name": "x", "min": 1, "max": 10, "is_int": True},
            {"name": "y", "min": 5, "max": 20, "is_int": True}
        ],
        "formula": "x + y * 2"
    }
    """
    params = {}
    for var in config.get("variables", []):
        name = var["name"]
        min_val = var.get("min", 0)
        max_val = var.get("max", 10)
        is_int = var.get("is_int", True)
        
        if is_int:
            params[name] = random.randint(int(min_val), int(max_val))
        else:
            val = random.uniform(float(min_val), float(max_val))
            params[name] = round(val, 2)
            
    formula = config.get("formula", "")
    correct_value = ""
    if formula:
        try:
            val = safe_eval_math(formula, params)
            if isinstance(val, float):
                # Format to remove unnecessary decimal zeros
                correct_value = f"{val:g}"
            else:
                correct_value = str(val)
        except Exception as e:
            correct_value = f"Error: {str(e)}"
            
    return params, correct_value
