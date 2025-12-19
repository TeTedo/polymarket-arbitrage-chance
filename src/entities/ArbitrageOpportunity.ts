import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("arbitrage_opportunity")
@Index(["marketId"])
@Index(["createdAt"])
export class ArbitrageOpportunity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  marketId!: string;

  @Column({ type: "varchar", length: 255 })
  yesToken!: string;

  @Column({ type: "varchar", length: 255 })
  noToken!: string;

  @Column({ type: "decimal", precision: 10, scale: 4 })
  buyPrice!: number;

  @Column({ type: "decimal", precision: 10, scale: 4 })
  sellPrice!: number;

  @Column({ type: "varchar", length: 10 })
  type!: string; // "buy" or "sell"

  @Column({ type: "varchar", length: 500, nullable: true })
  link!: string; // Polymarket market link

  @Column({ type: "text", nullable: true })
  question!: string; // Market question

  @CreateDateColumn()
  createdAt!: Date;
}
