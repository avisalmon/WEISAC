# IAS Machine Architecture

## Overview
The IAS machine was the first electronic computer built at the Institute for Advanced Study
(IAS) in Princeton, New Jersey. Designed under John von Neumann's direction, starting in
1946 and operational June 10, 1952. It operated until July 15, 1958.

The general organization became known as "von Neumann architecture": a stored-program
computer where instructions and data share the same memory.

## Physical Specifications

| Feature | Value |
|---------|-------|
| Developer | John von Neumann and team |
| Released | June 10, 1952 |
| Lifespan | 1952-1958 |
| Vacuum tubes | ~1,700 (triode types: 6J6, 5670, 5687) |
| Diodes | Type 6AL5 |
| Pentodes | 150 (to drive memory CRTs) |
| CRTs | 41 (type 5CP1A): 40 Williams tubes for memory + 1 monitor |
| Weight | ~1,000 lbs (450 kg) |
| Addition time | 62 microseconds |
| Multiplication time | 713 microseconds |

## Architecture

### Five Main Units (von Neumann Architecture)

```
+--------+     +--------+     +--------+
| Input  |---->| Memory |<--->| Output |
+--------+     +--------+     +--------+
                  ^   ^
                  |   |
              +---+   +---+
              |           |
         +----+----+ +----+----+
         | Control | |  Arith  |
         |  Unit   | |  Unit   |
         +---------+ +---------+
```

1. **Memory (M)**: Stores both data and instructions
2. **Arithmetic Unit (CA)**: Performs arithmetic operations
3. **Control Unit (CC)**: Sequences operations
4. **Input Organ (I)**: Reads data into memory
5. **Output Organ (O)**: Writes data from memory

### Word Format (40 bits)

```
+--------------------------------------------+
|             40-bit Word                     |
+--------------------------------------------+
| Left Instruction (20 bits) | Right Instruction (20 bits) |
| Bits 0-19                  | Bits 20-39                  |
+--------------------------------------------+
```

Each instruction:
```
+------------------+
| 20-bit Instruction |
+------------------+
| Opcode (8 bits) | Address (12 bits) |
| Bits 0-7        | Bits 8-19         |
+------------------+
```

### Memory
- 1,024 words (40 bits each)
- 12-bit address field can address 2^12 = 4,096 locations
  (but original IAS only had 1,024 words)
- Originally designed for RCA Selectron tubes, switched to Williams tubes

### Registers
- **AC (Accumulator)**: 40 bits. Main working register for arithmetic.
- **MQ (Multiplier/Quotient)**: 40 bits. Used in multiply and divide operations.
- **PC (Program Counter)**: Tracks current instruction address.
- **IR (Instruction Register)**: Holds the current instruction being executed.
- **MAR (Memory Address Register)**: Holds the address for memory operations.
- **MBR (Memory Buffer Register)**: Holds data being transferred to/from memory.

### Number Representation
- 40-bit signed integers
- Two's complement for negative numbers
- Bit 0 is the sign bit (0 = positive, 1 = negative)
- Range: -2^39 to 2^39 - 1

### Execution Model
- Asynchronous: No central clock. One instruction starts when the previous finishes.
- Sequential execution: Instructions fetched in order (left half then right half of each word)
- Self-modifying code: Programs could modify their own instructions in memory
  (used for implementing loops before index registers existed)

## IAS Machine Derivatives

Plans were freely distributed, spawning many derivative computers worldwide:

| Computer | Location | Year |
|----------|----------|------|
| AVIDAC | Argonne National Lab, USA | 1953 |
| BESK | Stockholm, Sweden | 1953 |
| ORACLE | Oak Ridge National Lab, USA | 1953 |
| JOHNNIAC | RAND Corporation, USA | 1954 |
| MANIAC I | Los Alamos, USA | 1952 |
| ILLIAC I | Univ. of Illinois, USA | 1952 |
| ORDVAC | Aberdeen Proving Ground, USA | 1951 |
| **WEIZAC** | **Weizmann Institute, Israel** | **1955** |
| DASK | Copenhagen, Denmark | 1958 |
| SILLIAC | Univ. of Sydney, Australia | 1956 |
| PERM | Munich, Germany | 1956 |
| IBM 701 | IBM (19 installations) | 1952 |

Note: Despite sharing the architecture, these machines were NOT software-compatible
with each other.

## Sources

- Wikipedia: IAS Machine - https://en.wikipedia.org/wiki/IAS_machine
- Burks, Goldstine, von Neumann, "Preliminary Discussion of the Logical Design of an
  Electronic Computing Instrument" (1946)
- von Neumann, "First Draft of a Report on the EDVAC" (1945)
- Willis Ware, "The History and Development of the Electronic Computer Project at IAS" (1953)
  http://www.bitsavers.org/pdf/rand/P-377_The_History_And_Development_Of_The_IAS_Computer_Mar53.pdf
- Bitsavers IAS documents: http://www.bitsavers.org/pdf/ias/
- George Dyson, "Turing's Cathedral" (2012)
