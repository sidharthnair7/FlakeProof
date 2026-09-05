"""CLI entry point.  python -m agent verify <fqcn#method> --times 20"""
import argparse

from agent import db


def main() -> None:
    parser = argparse.ArgumentParser(prog="agent")
    sub = parser.add_subparsers(dest="command", required=True)

    verify = sub.add_parser("verify", help="rerun a test N times and report the pass rate")
    verify.add_argument("test", help="fully.qualified.ClassName#methodName")
    verify.add_argument("--times", type=int, default=20)

    sub.add_parser("initdb", help="create the sqlite schema")

    args = parser.parse_args()

    if args.command == "initdb":
        db.init()
        print("db ready")
    elif args.command == "verify":
        fqcn, method = args.test.split("#", 1)
        print(f"TODO: rerun {fqcn}#{method} x{args.times}")


if __name__ == "__main__":
    main()
