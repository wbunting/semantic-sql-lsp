#!/usr/bin/env python3

import sys
import json
import sqlglot

def main():
    # Read entire SQL input from stdin
    sql = sys.stdin.read()
    try:
        # Parse the SQL input. This returns a list of parsed statements.
        # If you want a single statement, you could use parse_one instead,
        # but parse() handles multiple statements.
        trees = sqlglot.parse(sql, error_level='ignore')

        # Convert each parsed statement to a dictionary (parse tree)
        # using to_dict(), which is more structured than to_json().
        # If you prefer a JSON-like string, you can use to_json().
        parsed = [tree.dump() for tree in trees if tree is not None]

        # Print out the resulting JSON array of parse trees
        print(json.dumps(parsed, indent=2))
    except Exception as e:
        # If there's an error, print it out in JSON format
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
