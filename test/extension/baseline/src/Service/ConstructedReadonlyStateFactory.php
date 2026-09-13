<?php

declare(strict_types=1);

namespace App\Service;

final class ConstructedReadonlyStateFactory
{
    public static function createLocal(): InheritedConstructedReadonlyState
    {
        $state = new InheritedConstructedReadonlyState(7, 'local');

        return $state;
    }

    public static function createMatched(int $mode): InheritedConstructedReadonlyState
    {
        return match ($mode) {
            1, 2 => new InheritedConstructedReadonlyState(5, 'match'),
            default => new InheritedConstructedReadonlyState(6, 'match-default'),
        };
    }

    public static function create(bool $alternate = false): InheritedConstructedReadonlyState
    {
        switch ($alternate ? 1 : 0) {
            case 1:
                return new InheritedConstructedReadonlyState(4, 'switch');
            default:
                break;
        }

        foreach ([$alternate] as $candidate) {
            if ($candidate) {
                return new InheritedConstructedReadonlyState(3, 'loop');
            }

            continue;
        }

        try {
            if ($alternate) {
                throw new \RuntimeException();
            }

            return new InheritedConstructedReadonlyState(1, 'hidden');
        } catch (\RuntimeException) {
            return new InheritedConstructedReadonlyState(2, 'alternate');
        } finally {
            $completed = true;
        }
    }
}
