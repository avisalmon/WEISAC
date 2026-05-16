# IAS Machine Instruction Set

## Instruction Format

Each 40-bit memory word contains two 20-bit instructions:

```
|<------ Left Instruction ------>|<------ Right Instruction ----->|
| Opcode (8 bits) | Addr (12 bits)| Opcode (8 bits) | Addr (12 bits)|
| Bits 0-7        | Bits 8-19     | Bits 20-27      | Bits 28-39    |
```

The 8-bit opcode allows for up to 256 possible instructions.
The 12-bit address field can address up to 4,096 memory locations.

## Registers Used

- **AC** = Accumulator (40 bits) - main working register
- **MQ** = Multiplier/Quotient register (40 bits)
- **M(X)** = Contents of memory location X

## Complete Instruction Set (21 Instructions)

### Data Transfer Instructions

| Opcode (binary) | Opcode (hex) | Mnemonic | Operation | Description |
|-----------------|-------------|----------|-----------|-------------|
| 00001010 | 0A | LOAD MQ | AC <- MQ | Transfer contents of register MQ to AC |
| 00001001 | 09 | LOAD MQ,M(X) | MQ <- M(X) | Transfer contents of memory location X to MQ |
| 00100001 | 21 | STOR M(X) | M(X) <- AC | Transfer contents of AC to memory location X |
| 00000001 | 01 | LOAD M(X) | AC <- M(X) | Transfer contents of memory location X to AC |
| 00000010 | 02 | LOAD -M(X) | AC <- -M(X) | Transfer negation of M(X) to AC |
| 00000011 | 03 | LOAD \|M(X)\| | AC <- \|M(X)\| | Transfer absolute value of M(X) to AC |
| 00000100 | 04 | LOAD -\|M(X)\| | AC <- -\|M(X)\| | Transfer negation of absolute value of M(X) to AC |

### Arithmetic Instructions

| Opcode (binary) | Opcode (hex) | Mnemonic | Operation | Description |
|-----------------|-------------|----------|-----------|-------------|
| 00000101 | 05 | ADD M(X) | AC <- AC + M(X) | Add M(X) to AC; result in AC |
| 00000111 | 07 | ADD \|M(X)\| | AC <- AC + \|M(X)\| | Add absolute value of M(X) to AC; result in AC |
| 00000110 | 06 | SUB M(X) | AC <- AC - M(X) | Subtract M(X) from AC; result in AC |
| 00001000 | 08 | SUB \|M(X)\| | AC <- AC - \|M(X)\| | Subtract absolute value of M(X) from AC |
| 00001011 | 0B | MUL M(X) | AC:MQ <- MQ * M(X) | Multiply MQ by M(X); most significant bits in AC, least significant in MQ |
| 00001100 | 0C | DIV M(X) | MQ <- AC / M(X), AC <- AC % M(X) | Divide AC by M(X); quotient in MQ, remainder in AC |
| 00010100 | 14 | LSH | AC <- AC * 2 | Left shift AC by one bit position |
| 00010101 | 15 | RSH | AC <- AC / 2 | Right shift AC by one bit position |

### Address Modify Instructions

These instructions allow self-modifying code (the primary way to implement loops
and array indexing before index registers were invented):

| Opcode (binary) | Opcode (hex) | Mnemonic | Operation | Description |
|-----------------|-------------|----------|-----------|-------------|
| 00010010 | 12 | STOR M(X,8:19) | M(X)[8:19] <- AC[28:39] | Replace left address field of word at M(X) with 12 rightmost bits of AC |
| 00010011 | 13 | STOR M(X,28:39) | M(X)[28:39] <- AC[28:39] | Replace right address field of word at M(X) with 12 rightmost bits of AC |

### Conditional Branch Instructions

| Opcode (binary) | Opcode (hex) | Mnemonic | Operation | Description |
|-----------------|-------------|----------|-----------|-------------|
| 00001101 | 0D | JUMP+ M(X,0:19) | If AC >= 0, go to left instruction in M(X) | Conditional jump to left half of word at X |
| 00001110 | 0E | JUMP+ M(X,20:39) | If AC >= 0, go to right instruction in M(X) | Conditional jump to right half of word at X |

### Unconditional Branch Instructions

| Opcode (binary) | Opcode (hex) | Mnemonic | Operation | Description |
|-----------------|-------------|----------|-----------|-------------|
| 00001111 | 0F | JUMP M(X,0:19) | Go to left instruction in M(X) | Unconditional jump to left half of word at X |
| 00010000 | 10 | JUMP M(X,20:39) | Go to right instruction in M(X) | Unconditional jump to right half of word at X |

## Instruction Summary by Category

```
DATA TRANSFER (7):  LOAD MQ, LOAD MQ,M(X), STOR M(X), LOAD M(X),
                    LOAD -M(X), LOAD |M(X)|, LOAD -|M(X)|

ARITHMETIC (8):     ADD M(X), ADD |M(X)|, SUB M(X), SUB |M(X)|,
                    MUL M(X), DIV M(X), LSH, RSH

ADDRESS MODIFY (2): STOR M(X,8:19), STOR M(X,28:39)

COND. BRANCH (2):   JUMP+ M(X,0:19), JUMP+ M(X,20:39)

UNCOND. BRANCH (2): JUMP M(X,0:19), JUMP M(X,20:39)

TOTAL: 21 instructions
```

## Execution Cycle

1. **Fetch**: Read the 40-bit word from the memory address in PC
2. **Decode**: Extract the left instruction (bits 0-19) first
   - Separate opcode (bits 0-7) from address (bits 8-19)
3. **Execute**: Perform the operation indicated by the opcode
4. **Next**: If there is a right instruction and no jump occurred,
   execute the right instruction (bits 20-39) from the same word
5. **Increment**: Move PC to next word and repeat

## Programming Notes

- No subroutine/return mechanism (no stack, no CALL/RET)
- No index registers (address modification done via self-modifying code)
- No interrupt system
- Loops implemented by modifying jump target addresses in memory
- Array indexing implemented by modifying load/store addresses in memory
- Only one conditional test: AC >= 0 (branch on non-negative)
- To test AC < 0: use JUMP+ to skip over the "then" branch
- To test equality: subtract and test if result >= 0 and negation >= 0

## Example: Simple Addition

To compute C = A + B where A is at address 100, B at 101, C at 102:

```
Word N:    LOAD M(100)    |  ADD M(101)
Word N+1:  STOR M(102)    |  (next instruction...)
```

## Example: Simple Loop (sum array of 10 numbers starting at address 200)

This requires self-modifying code to iterate through the array:

```
; Assume sum stored at address 300, loop counter at 301
; The LOAD instruction at word 10 will be modified each iteration

Word 10:   LOAD M(200)    |  ADD M(300)      ; load element, add to sum
Word 11:   STOR M(300)    |  LOAD M(10)      ; store sum, load the instruction word
Word 12:   ADD M(302)     |  STOR M(10,8:19) ; increment address, store back
Word 13:   LOAD M(301)    |  SUB M(303)      ; load counter, subtract limit
Word 14:   JUMP+ M(15,20:39) | JUMP M(10,0:19) ; if done skip, else loop
Word 15:   (next code)    |  (halt or continue)
; Address 302 contains the value 1 (increment for address)
; Address 303 contains the value 10 (loop limit)
```

## WEIZAC-Specific Notes

WEIZAC used the same basic IAS instruction set architecture:
- 40-bit words, two 20-bit instructions per word
- 8-bit opcode, 12-bit address
- Same AC and MQ registers
- Same instruction categories

However, WEIZAC was NOT software-compatible with the original IAS machine or other
IAS derivatives. Each derivative machine may have had minor variations in:
- Exact opcode encodings
- Additional instructions
- I/O instruction details
- Memory addressing specifics

## Sources

- Burks, Goldstine, von Neumann, "Preliminary Discussion of the Logical Design of an
  Electronic Computing Instrument" (1946)
- von Neumann, "First Draft of a Report on the EDVAC" (1945)
- Stallings, "Computer Organization and Architecture" (standard textbook reference for
  IAS instruction set)
- IAS Final Report (Jan 1954): http://www.bitsavers.org/pdf/ias/IAS_Final_Report_Jan54.pdf
- Planning and Coding of Problems for an Electronic Computing Instrument, Part II, Vol II (1948):
  http://www.bitsavers.org/pdf/ias/Planning_and_Coding_of_Problems_for_an_Electronic_Computing_Instrument_Part_II_Volume_II_Apr48.pdf
