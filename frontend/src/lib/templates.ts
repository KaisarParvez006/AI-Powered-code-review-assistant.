import type { LangId } from '../types'

export const DEFAULT_CODE: Record<LangId, string> = {
  c: `#include <stdio.h>

int main(void) {
    int a = 5 / 0;
    printf("Hello\\n");
    return 0;
}
`,
  cpp: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    v.push_back(1);
    // Potential issue: no bounds check on access
    std::cout << v[10] << std::endl;
    return 0;
}
`,
  python: `def divide(a, b):
    return a / b

def main():
    print(divide(10, 0))

if __name__ == "__main__":
    main()
`,
  java: `public class Main {
    public static void main(String[] args) {
        String s = null;
        System.out.println(s.length());
    }
}
`,
}
