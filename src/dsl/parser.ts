// Recursive-descent parser: tokens → AST.
//
// Precedence, tightest to loosest:  ..   >   * /   >   + -   (parens override).

import { ParseError, Value } from "./types";
import { Token, tokenize } from "./lexer";
import { parseLiteral } from "./literal";

export type BinOp = "+" | "-" | "*" | "/";

const IDENT_RE = /^[A-Za-z]+$/;

export type Node =
  | { type: "literal"; value: Value; pos: number; end: number }
  | { type: "ident"; name: string; pos: number; end: number }
  | { type: "binary"; op: BinOp; left: Node; right: Node; pos: number; end: number }
  | { type: "range"; left: Node; right: Node; pos: number; end: number }
  | { type: "call"; name: string; args: Node[]; pos: number; end: number }
  // `args` undefined => property access (.seconds); present => method call (.trunc(s))
  | { type: "member"; object: Node; name: string; args?: Node[]; pos: number; end: number };

class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }

  private next(): Token {
    return this.tokens[this.i++];
  }

  parse(): Node {
    if (this.tokens.length === 0) {
      throw new ParseError("Empty expression");
    }
    const node = this.parseAdd();
    const rest = this.peek();
    if (rest) {
      throw new ParseError(`Unexpected '${rest.value}'`, rest.pos, rest.end);
    }
    return node;
  }

  private parseAdd(): Node {
    let left = this.parseMul();
    let t = this.peek();
    while (t && (t.type === "plus" || t.type === "minus")) {
      this.next();
      const right = this.parseMul();
      left = {
        type: "binary",
        op: t.type === "plus" ? "+" : "-",
        left,
        right,
        pos: left.pos,
        end: right.end,
      };
      t = this.peek();
    }
    return left;
  }

  private parseMul(): Node {
    let left = this.parseRange();
    let t = this.peek();
    while (t && (t.type === "star" || t.type === "slash")) {
      this.next();
      const right = this.parseRange();
      left = {
        type: "binary",
        op: t.type === "star" ? "*" : "/",
        left,
        right,
        pos: left.pos,
        end: right.end,
      };
      t = this.peek();
    }
    return left;
  }

  private parseRange(): Node {
    const left = this.parsePostfix();
    const t = this.peek();
    if (t && t.type === "range") {
      this.next();
      const right = this.parsePostfix();
      return { type: "range", left, right, pos: left.pos, end: right.end };
    }
    return left;
  }

  // Member access / method calls bind tightest, applied left-to-right after a primary.
  private parsePostfix(): Node {
    let node = this.parsePrimary();
    while (this.peek() && this.peek()!.type === "dot") {
      this.next(); // consume '.'
      const nameTok = this.peek();
      if (!nameTok || nameTok.type !== "atom" || !IDENT_RE.test(nameTok.value)) {
        throw new ParseError("Expected a property or method name after '.'", nameTok?.pos);
      }
      this.next();
      if (this.peek() && this.peek()!.type === "lparen") {
        const { args, end } = this.parseArgs();
        node = { type: "member", object: node, name: nameTok.value, args, pos: node.pos, end };
      } else {
        node = {
          type: "member",
          object: node,
          name: nameTok.value,
          pos: node.pos,
          end: nameTok.end,
        };
      }
    }
    return node;
  }

  // Parse `( expr (, expr)* )`. Assumes the current token is '('.
  private parseArgs(): { args: Node[]; end: number } {
    this.next(); // consume '('
    const args: Node[] = [];
    if (this.peek() && this.peek()!.type !== "rparen") {
      args.push(this.parseAdd());
      while (this.peek() && this.peek()!.type === "comma") {
        this.next();
        args.push(this.parseAdd());
      }
    }
    const close = this.peek();
    if (!close || close.type !== "rparen") {
      throw new ParseError("Missing closing ')'");
    }
    this.next();
    return { args, end: close.end };
  }

  private parsePrimary(): Node {
    const t = this.peek();
    if (!t) throw new ParseError("Unexpected end of expression");

    if (t.type === "lparen") {
      this.next();
      const inner = this.parseAdd();
      const close = this.peek();
      if (!close || close.type !== "rparen") {
        throw new ParseError("Missing closing ')'", t.pos);
      }
      this.next();
      return inner;
    }

    if (t.type === "string") {
      this.next();
      return { type: "literal", value: parseLiteral(t.value, t.pos, t.end), pos: t.pos, end: t.end };
    }

    if (t.type === "atom") {
      // A pure-alphabetic atom is an identifier: a function name (if followed by
      // `(`) or a unit reference. Everything else is a literal (possibly several
      // juxtaposed atoms, e.g. `2000/06/15 8:50`).
      if (IDENT_RE.test(t.value)) {
        this.next();
        if (this.peek() && this.peek()!.type === "lparen") {
          const { args, end } = this.parseArgs();
          return { type: "call", name: t.value, args, pos: t.pos, end };
        }
        return { type: "ident", name: t.value, pos: t.pos, end: t.end };
      }

      const start = t.pos;
      const pieces: string[] = [];
      let last = t;
      while (this.peek() && this.peek()!.type === "atom") {
        last = this.next();
        pieces.push(last.value);
      }
      const raw = pieces.join(" ");
      return {
        type: "literal",
        value: parseLiteral(raw, start, last.end),
        pos: start,
        end: last.end,
      };
    }

    throw new ParseError(`Unexpected '${t.value}'`, t.pos, t.end);
  }
}

export function parse(src: string): Node {
  return new Parser(tokenize(src)).parse();
}
