import sys
import twint

def main(argv):
    c = twint.Config()
    c.Username = argv[0]
    c.Limit = argv[1]
    c.Retweets = True

    twint.run.Profile(c)


if __name__ == "__main__":
   main(sys.argv[1:])
